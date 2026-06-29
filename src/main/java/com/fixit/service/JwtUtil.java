package com.fixit.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtUtil {

    private static final long EXPIRACION_MS = 30L * 24 * 60 * 60 * 1000; // 30 días

    private final SecretKey key;

    public JwtUtil(@Value("${fixit.jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generarToken(Integer userId, String tipo) {
        return Jwts.builder()
                .claim("userId", userId)
                .claim("tipo", tipo)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRACION_MS))
                .signWith(key)
                .compact();
    }

    public Optional<Integer> getUserId(String token) {
        return parseClaims(token).map(c -> c.get("userId", Integer.class));
    }

    public Optional<String> getTipo(String token) {
        return parseClaims(token).map(c -> c.get("tipo", String.class));
    }

    private Optional<Claims> parseClaims(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        try {
            return Optional.of(
                Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload()
            );
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
