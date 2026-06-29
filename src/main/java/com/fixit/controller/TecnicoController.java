package com.fixit.controller;

import com.fixit.model.Tecnico;
import com.fixit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/tecnicos")
@RequiredArgsConstructor
public class TecnicoController {

    private final TecnicoRepository tecnicoRepo;
    private final CalificacionRepository calificacionRepo;

    @GetMapping
    public List<Map<String, Object>> listar() {
        return tecnicoRepo.findAll().stream().map(this::toMap).toList();
    }

    @GetMapping("/disponibles")
    public List<Map<String, Object>> disponibles() {
        return tecnicoRepo.findByDisponibilidadTrue().stream().map(this::toMap).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Integer id) {
        return tecnicoRepo.findById(id)
                .map(t -> ResponseEntity.ok(toMap(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/disponibilidad")
    public ResponseEntity<?> toggleDisponibilidad(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id,
            @RequestBody Map<String, Boolean> body) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));

        Optional<Tecnico> opt = tecnicoRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Tecnico t = opt.get();
        if (!t.getUsuario().getIdUsuario().equals(uid.get()))
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));

        t.setDisponibilidad(body.getOrDefault("disponibilidad", true));
        tecnicoRepo.save(t);
        return ResponseEntity.ok(Map.of("disponibilidad", t.getDisponibilidad()));
    }

    private Map<String, Object> toMap(Tecnico t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getIdtecnico());
        m.put("idUsuario", t.getUsuario().getIdUsuario());
        m.put("nombre", t.getUsuario().getNombre());
        m.put("apellido", t.getUsuario().getApellido());
        m.put("especialidades", t.getEspecialidades() != null ? t.getEspecialidades() : "");
        m.put("disponibilidad", t.getDisponibilidad());
        m.put("latitud", t.getLatitud());
        m.put("longitud", t.getLongitud());
        Double prom = calificacionRepo.promedioEstrellasCtx(t.getUsuario().getIdUsuario(), "tecnico");
        Long total  = calificacionRepo.totalCalificacionesCtx(t.getUsuario().getIdUsuario(), "tecnico");
        m.put("calificacionPromedio", prom  != null ? prom  : 5.0);
        m.put("calificacionTotal",    total != null ? total : 0);
        m.put("serviciosRealizados", t.getServiciosRealizados() != null ? t.getServiciosRealizados() : 0);
        return m;
    }
}
