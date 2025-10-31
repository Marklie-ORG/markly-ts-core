import Router from "@koa/router";
import compose from "koa-compose";

export class MarklieRouter {
    static compose(controllers: Router[]) {
        const root = new Router();

        for (const c of controllers) {
            root.use(c.routes());
            root.use(c.allowedMethods());
        }

        return compose([root.routes(), root.allowedMethods()]);
    }
}
