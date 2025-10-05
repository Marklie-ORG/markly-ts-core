import type { Image } from "lib/entities/Image";

export interface CreateOrganizationRequest {
  name: string;
}

export interface UseInviteCodeRequest {
  code: string;
}

export interface Conversations {
  channels: Channel[];
  ims: IM[];
}

export interface Channel {
  id: string;
  name: string;
}

export interface IM {
  id: string;
  name: string;
  image: string;
}

export interface ImageWithUrl extends Image {
  imageUrl: string;
}

export interface ShareClientDatabaseRequest {
  clientUuid: string;
  emails: string[];
}

export interface VerifyClientAccessRequest {
  token: string;
}

export interface RequestClientAccessRequest {
  email: string;
  reportUuid?: string;
  clientUuid?: string;
}