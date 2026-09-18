package net.ripe.whois.services;

public class AuthoritativeWhoisUnavailableException extends RuntimeException {

    public AuthoritativeWhoisUnavailableException(final String message, final Throwable cause) {
        super(message, cause);
    }

    public AuthoritativeWhoisUnavailableException(final String message) {
        super(message);
    }
}
