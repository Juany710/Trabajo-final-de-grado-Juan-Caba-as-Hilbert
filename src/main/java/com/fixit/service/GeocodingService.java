package com.fixit.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GeocodingService {

    private static final HttpClient httpClient = HttpClient.newHttpClient();
    private static final ConcurrentHashMap<String, double[]> cache = new ConcurrentHashMap<>();
    private static final ObjectMapper mapper = new ObjectMapper();

    // Returns [lat, lng] or null if not found
    public double[] geocodificar(String direccion) {
        if (direccion == null || direccion.isBlank()) return null;
        // Añadir Argentina si no está para mejorar resultados
        String query = direccion.trim();
        if (!query.toLowerCase().contains("argentina")) query = query + ", Argentina";
        String key = query.toLowerCase();
        if (cache.containsKey(key)) return cache.get(key);
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=1";
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "FIXIT-App/1.0")
                    .header("Accept", "application/json")
                    .GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            String body = resp.body();
            if (body == null || body.equals("[]")) return null;
            JsonNode arr = mapper.readTree(body);
            if (arr.isEmpty()) return null;
            double lat = arr.get(0).get("lat").asDouble();
            double lng = arr.get(0).get("lon").asDouble();
            double[] coords = {lat, lng};
            cache.put(key, coords);
            return coords;
        } catch (Exception e) {
            return null;
        }
    }
}
