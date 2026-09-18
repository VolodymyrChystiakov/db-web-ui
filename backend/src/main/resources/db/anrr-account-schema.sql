CREATE TABLE IF NOT EXISTS organisation (
    org_object_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (org_object_id)
);

CREATE TABLE IF NOT EXISTS membership (
    keycloak_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    org_object_id VARCHAR(64) NOT NULL,
    `role` VARCHAR(64) NOT NULL,
    PRIMARY KEY (keycloak_uuid, org_object_id, `role`),
    CONSTRAINT membership_organisation_fk
        FOREIGN KEY (org_object_id) REFERENCES organisation (org_object_id)
);
