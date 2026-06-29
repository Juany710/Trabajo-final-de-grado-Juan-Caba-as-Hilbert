package com.fixit.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/geocode")
public class GeocodeController {

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<String> geocode(@RequestParam String q) {
        String key = q.toLowerCase().trim();
        String cached = cache.get(key);
        if (cached != null) {
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(cached);
        }
        try {
            String encoded = URLEncoder.encode(q, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=1";
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "FIXIT-App/1.0")
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            String body = resp.body();
            if (body != null && !body.equals("[]")) cache.put(key, body);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(body);
        } catch (Exception e) {
            return ResponseEntity.ok("[]");
        }
    }
}
