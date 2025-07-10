import { PubSub, Topic, Subscription } from "@google-cloud/pubsub";
import { Log } from "./Logger.js";

const logger = Log.getInstance().extend("pub/sub");

export class PubSubWrapper {
  private static pubsub = new PubSub({ projectId: "saas-452909" });

  static async publishMessage<T = any>(
    topicName: string,
    message: T,
  ): Promise<string> {
    const environmentTopic = `${process.env.ENVIRONMENT}-${topicName}`;
    const dataBuffer = Buffer.from(JSON.stringify(message));
    const topic: Topic = PubSubWrapper.pubsub.topic(environmentTopic);

    try {
      const messageId = await topic.publishMessage({ data: dataBuffer });
      logger.info(`Published to ${environmentTopic}: message ID ${messageId}`);
      return messageId;
    } catch (err: any) {
      logger.error(`Failed to publish to ${environmentTopic}: ${err.message}`);
      throw err;
    }
  }

  static subscribe<T = any>(
    subscriptionName: string,
    onMessage: (msg: T) => Promise<void>,
    onError?: (err: Error) => void,
  ): Subscription {
    const environmentSubscription = `${process.env.ENVIRONMENT}-${subscriptionName}`;

    const subscription: Subscription = this.pubsub.subscription(
      environmentSubscription,
      {
        flowControl: {
          maxMessages: 10,
          allowExcessMessages: false,
        },
      },
    );

    subscription.on("message", (message) => {
      const extender = setInterval(() => {
        message.modAck(60);
      }, 5000);

      void (async () => {
        try {
          const parsed = JSON.parse(message.data.toString()) as T;
          logger.info(
            `Handling message ${message.id} from ${environmentSubscription}`,
          );
          await onMessage(parsed);
          message.ack();
        } catch (err: any) {
          logger.error(`Error in message handler: ${err.message}`);
          if (err.response?.body) console.error(err.response.body);
          onError?.(err);
        } finally {
          clearInterval(extender);
        }
      })();
    });

    subscription.on("error", (err) => {
      logger.error(
        `Subscription ${environmentSubscription} failed: ${err.message}`,
      );
      onError?.(err);
    });

    return subscription;
  }

  static async shutdown(): Promise<void> {
    try {
      await PubSubWrapper.pubsub.close();
      logger.info("PubSub client shut down gracefully.");
    } catch (err: any) {
      logger.error("Failed to shut down PubSub client:", err.message);
    }
  }
}
