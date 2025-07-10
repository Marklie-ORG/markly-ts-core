export interface UsersList {
  members: Member[];
}

export interface Member {
  id: string;
  profile: Profile;
}

export interface Profile {
  real_name: string;
  image_48: string;
}
