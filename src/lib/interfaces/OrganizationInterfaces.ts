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
