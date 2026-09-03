package com.groupdna.api.auth;

import java.util.Locale;
import java.util.UUID;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final PasswordEncoder passwordEncoder;
    private final ConcurrentMap<String, UserRecord> users = new ConcurrentHashMap<>();
    private final Path userFile = Path.of("backend", "data", "users.tsv");

    public AuthService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
        loadUsers();
    }

    public synchronized AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        UserRecord user = new UserRecord(request.name().trim(), email, passwordEncoder.encode(request.password()));
        if (users.putIfAbsent(email, user) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        saveUsers();
        return response(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        UserRecord user = users.get(normalizeEmail(request.email()));
        if (user == null || !passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }
        return response(user);
    }

    private AuthDtos.AuthResponse response(UserRecord user) {
        return new AuthDtos.AuthResponse(UUID.randomUUID().toString(), user.name(), user.email());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void loadUsers() {
        if (!Files.exists(userFile)) {
            return;
        }
        try {
            List<String> lines = Files.readAllLines(userFile, StandardCharsets.UTF_8);
            for (String line : lines) {
                String[] fields = line.split("\\t", -1);
                if (fields.length == 3) {
                    String name = new String(Base64.getDecoder().decode(fields[0]), StandardCharsets.UTF_8);
                    String email = normalizeEmail(fields[1]);
                    users.put(email, new UserRecord(name, email, fields[2]));
                }
            }
        } catch (IOException | IllegalArgumentException error) {
            throw new IllegalStateException("Could not load local user store", error);
        }
    }

    private void saveUsers() {
        try {
            Files.createDirectories(userFile.getParent());
            List<String> lines = users.values().stream()
                    .map(user -> Base64.getEncoder().encodeToString(user.name().getBytes(StandardCharsets.UTF_8))
                            + "\t" + user.email() + "\t" + user.passwordHash())
                    .toList();
            Files.write(userFile, lines, StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("Could not save local user store", error);
        }
    }

    private record UserRecord(String name, String email, String passwordHash) {}
}
