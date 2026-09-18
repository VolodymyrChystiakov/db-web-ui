export interface IUserInfoOrganisation {
    orgObjectId: string;
    organisationName: string;
    roles: string[];
    lir?: boolean;
}

export interface IUserInfoRegistration extends IUserInfoOrganisation {
    membershipId: string;
    regId: string;
}

export type UserOidc = {
    name?: string;
    displayName?: string;
    uuid?: string;
    email: string;
    username?: string;
    photo?: string;
};

export interface UserOrgsAndRegistrations {
    user: UserOidc;
    organisations: IUserInfoOrganisation[];
    members?: IUserInfoRegistration[];
}
