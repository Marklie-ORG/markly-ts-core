export interface Root {
  data: Daum[];
  paging: Paging3;
}

export interface Daum {
  id: string;
  name: string;
  owned_ad_accounts?: OwnedAdAccounts;
  client_ad_accounts?: ClientAdAccounts;
}

export interface OwnedAdAccounts {
  data: Daum2[];
  paging: Paging;
}

export interface Daum2 {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  business: Business;
}

export interface Paging {
  cursors: Cursors;
  next?: string;
}

export interface Cursors {
  before: string;
  after: string;
}

export interface ClientAdAccounts {
  data: Daum3[];
  paging: Paging2;
}

export interface Daum3 {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  business: Business;
}

export interface Business {
  id: string;
  name: string;
}

export interface Paging2 {
  cursors: Cursors2;
  next?: string;
}

export interface Cursors2 {
  before: string;
  after: string;
}

export interface Paging3 {
  cursors: Cursors3;
  next: string;
}

export interface Cursors3 {
  before: string;
  after: string;
}

export interface AccountHierarchy {
  id: string;
  name: string;
  ad_accounts: {
    id: string;
    name: string;
  }[];
  // client_ad_accounts: {
  //   id: string;
  //   name: string;
  // }[];
}
