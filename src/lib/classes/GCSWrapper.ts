import { Storage, File } from "@google-cloud/storage";

export class GCSWrapper {
  private static instance: GCSWrapper;
  private storage: Storage;
  private bucketName: string;

  private constructor(bucketName: string) {
    this.storage = new Storage();
    this.bucketName = bucketName;
  }

  public static getInstance(bucketName: string): GCSWrapper {
    if (!GCSWrapper.instance) {
      GCSWrapper.instance = new GCSWrapper(bucketName);
    }
    return GCSWrapper.instance;
  }

  public async uploadBuffer(
    buffer: Buffer,
    destination: string,
    contentType = "application/octet-stream",
    makePublic = false,
    generateSignedUrl = false,
    signedUrlExpiresInSeconds = 3600,
  ): Promise<string> {
    const file = this.storage.bucket(this.bucketName).file(destination);

    await file.save(buffer, {
      contentType,
      resumable: false,
    });

    if (makePublic) {
      await file.makePublic();
      return `https://storage.googleapis.com/${this.bucketName}/${destination}`;
    }

    if (generateSignedUrl) {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + signedUrlExpiresInSeconds * 1000,
      });
      return url;
    }

    return `gs://${this.bucketName}/${destination}`;
  }

  public async uploadImage(fileData: any, buffer: Buffer, destination: string) {
    const file = this.storage.bucket(this.bucketName).file(destination);

    const stream = file.createWriteStream({
      resumable: false,
      contentType: fileData.mimetype,
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(buffer);
    });

    return `gs://${this.bucketName}/${destination}`;
  }

  public async getSignedUrl(gsUri: string) {
    const file = File.from(gsUri, this.storage);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 3600 * 1000,
    });
    return url;
  }

  public async deleteFile(destination: string): Promise<void> {
    await this.storage.bucket(this.bucketName).file(destination).delete();
  }

  public async fileExists(destination: string): Promise<boolean> {
    const [exists] = await this.storage
      .bucket(this.bucketName)
      .file(destination)
      .exists();
    return exists;
  }

  public async getReport(publicUrlOrPath: string) {
    let filePathInBucket: string;

    const cleanedUrl = publicUrlOrPath.split("?")[0];

    if (cleanedUrl.startsWith("https://storage.googleapis.com/")) {
      filePathInBucket = cleanedUrl.replace(
        `https://storage.googleapis.com/${this.bucketName}/`,
        "",
      );
    } else if (cleanedUrl.startsWith("gs://")) {
      filePathInBucket = cleanedUrl.replace(`gs://${this.bucketName}/`, "");
    } else {
      filePathInBucket = cleanedUrl;
    }

    const file = this.storage.bucket(this.bucketName).file(filePathInBucket);

    const [fileBuffer] = await file.download();
    return fileBuffer.toString("base64");
  }
}
