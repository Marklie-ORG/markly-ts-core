import {
  Entity,
  ManyToOne,
  Enum,
  Property,
  BeforeCreate,
  BeforeUpdate,
  OnLoad,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity.js";
import { Organization } from "./Organization.js";
import { OrganizationTokenType } from "../enums/enums.js";
import crypto from "crypto";

@Entity()
export class OrganizationToken extends BaseEntity {
  @Enum()
  type!: OrganizationTokenType;

  @Property({ type: "text" })
  encryptedToken!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;

  @Property({ type: "varchar", length: 32 })
  iv!: string;

  @Property({ type: "varchar", length: 32 })
  tag!: string;

  @BeforeCreate()
  @BeforeUpdate()
  encryptToken() {
    if (this.token) {
      const result = encrypt(this.token);
      this.encryptedToken = result.value;
      this.iv = result.iv;
      this.tag = result.tag;
    }
  }

  token!: string;

  @OnLoad()
  decryptToken() {
    if (this.encryptedToken && this.iv && this.tag) {
      this.token = decrypt({
        value: this.encryptedToken,
        iv: this.iv,
        tag: this.tag,
      });
    }
  }
}

const ALGORITHM = "aes-256-gcm";
function getKey(): Buffer {
  if (!process.env.ORG_TOKEN_SECRET_KEY) {
    throw new Error("Missing ORG_TOKEN_SECRET_KEY");
  }
  return Buffer.from(process.env.ORG_TOKEN_SECRET_KEY, "hex");
}

export function encrypt(text: string): {
  value: string;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    value: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decrypt({
  value,
  iv,
  tag,
}: {
  value: string;
  iv: string;
  tag: string;
}): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(value, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
