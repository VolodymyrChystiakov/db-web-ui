package net.ripe.whois.services;

public class AccountStoreUnavailableException extends RuntimeException {

    public AccountStoreUnavailableException(final String message) {
        super(message);
    }

    public AccountStoreUnavailableException(final String message, final Throwable cause) {
        super(message, cause);
    }
}
