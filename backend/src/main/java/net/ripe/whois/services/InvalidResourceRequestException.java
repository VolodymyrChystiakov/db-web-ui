package net.ripe.whois.services;

public class InvalidResourceRequestException extends RuntimeException {

    public InvalidResourceRequestException(final String message) {
        super(message);
    }
}
