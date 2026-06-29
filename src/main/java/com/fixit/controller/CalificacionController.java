package com.fixit.controller;

import com.fixit.model.Calificacion;
import com.fixit.model.Usuario;
import com.fixit.repository.CalificacionRepository;
import com.fixit.repository.SolicitudRepository;
import com.fixit.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/calificaciones")
@RequiredArgsConstructor
public class CalificacionController {

    private final CalificacionRepository calificacionRepo;
    private final UsuarioRepository usuarioRepo;
    private final SolicitudRepository solicitudRepo;

    @PostMapping
    public ResponseEntity<?> calificar(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));

        Integer destinatarioId = (Integer) body.get("destinatarioId");
        Integer estrellas      = (Integer) body.get("estrellas");
        Integer solicitudId    = (Integer) body.get("solicitudId");
        String contexto        = body.getOrDefault("contexto", "tecnico").toString();

        if (estrellas == null || estrellas < 1 || estrellas > 5)
            return ResponseEntity.badRequest().body(Map.of("error", "Calificación inválida (1-5)"));

        Optional<Usuario> autor = usuarioRepo.findById(uid.get());
        Optional<Usuario> dest  = usuarioRepo.findById(destinatarioId);
        if (autor.isEmpty() || dest.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));

        if (solicitudId != null) {
            Optional<Calificacion> existing = calificacionRepo.findByAutorAndSolicitud(uid.get(), solicitudId);
            if (existing.isPresent()) {
                Calificacion c = existing.get();
                c.setEstrellas(estrellas);
                c.setOpinion((String) body.getOrDefault("opinion", ""));
                c.setFechaCalificacion(LocalDateTime.now());
                calificacionRepo.save(c);
                return ResponseEntity.ok(Map.of("ok", true, "updated", true));
            }
        }

        Calificacion c = new Calificacion();
        c.setAutor(autor.get());
        c.setDestinatario(dest.get());
        c.setEstrellas(estrellas);
        c.setOpinion((String) body.getOrDefault("opinion", ""));
        c.setContexto(contexto);
        if (solicitudId != null)
            solicitudRepo.findById(solicitudId).ifPresent(c::setSolicitud);

        calificacionRepo.save(c);
        return ResponseEntity.ok(Map.of("ok", true, "updated", false));
    }

    @GetMapping("/usuario/{id}")
    public ResponseEntity<?> porUsuario(@PathVariable Integer id) {
        return porUsuarioCtx(id, null);
    }

    @GetMapping("/usuario/{id}/contexto/{ctx}")
    public ResponseEntity<?> porUsuarioConContexto(@PathVariable Integer id, @PathVariable String ctx) {
        return porUsuarioCtx(id, ctx);
    }

    private ResponseEntity<?> porUsuarioCtx(Integer id, String ctx) {
        List<Calificacion> raw = ctx != null
            ? calificacionRepo.findByDestinatario_IdUsuarioAndContextoOrderByFechaCalificacionDesc(id, ctx)
            : calificacionRepo.findByDestinatario_IdUsuarioOrderByFechaCalificacionDesc(id);

        List<Map<String, Object>> lista = raw.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("estrellas", c.getEstrellas());
            m.put("opinion", c.getOpinion() != null ? c.getOpinion() : "");
            m.put("fecha", c.getFechaCalificacion());
            m.put("autor", c.getAutor().getNombre() + " " + c.getAutor().getApellido());
            return m;
        }).toList();

        Double prom  = ctx != null ? calificacionRepo.promedioEstrellasCtx(id, ctx)  : calificacionRepo.promedioEstrellas(id);
        Long   total = ctx != null ? calificacionRepo.totalCalificacionesCtx(id, ctx) : calificacionRepo.totalCalificaciones(id);
        return ResponseEntity.ok(Map.of(
            "promedio", prom  != null ? prom  : 5.0,
            "total",    total != null ? total : 0,
            "calificaciones", lista
        ));
    }
}
