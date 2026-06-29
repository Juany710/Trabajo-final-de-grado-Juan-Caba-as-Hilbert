package com.fixit.controller;

import com.fixit.model.*;
import com.fixit.repository.*;
import com.fixit.service.OfertaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/ofertas")
@RequiredArgsConstructor
public class OfertaController {

    private final OfertaRepository ofertaRepo;
    private final TecnicoRepository tecnicoRepo;
    private final OfertaService ofertaService;

    @PostMapping("/solicitud/{idSolicitud}")
    public ResponseEntity<?> hacerOferta(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer idSolicitud,
            @RequestBody Map<String, Object> body) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Oferta o = ofertaService.hacerOferta(uid.get(), idSolicitud, body);
        return ResponseEntity.ok(toMap(o));
    }

    @GetMapping("/solicitud/{idSolicitud}")
    public List<Map<String, Object>> ofertasDeSolicitud(@PathVariable Integer idSolicitud) {
        return ofertaRepo.findBySolicitudId(idSolicitud).stream().map(this::toMap).toList();
    }

    @GetMapping("/mis-ofertas")
    public ResponseEntity<?> misOfertas(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Optional<Tecnico> tec = tecnicoRepo.findByUsuario_IdUsuario(uid.get());
        if (tec.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(
            ofertaRepo.findByTecnico_Idtecnico(tec.get().getIdtecnico()).stream().map(this::toMap).toList());
    }

    @PutMapping("/{id}/aceptar")
    public ResponseEntity<?> aceptar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Servicio srv = ofertaService.aceptar(id);
        return ResponseEntity.ok(Map.of("mensaje", "Oferta aceptada", "servicioId", srv.getIdservicio()));
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        ofertaService.cancelar(id);
        return ResponseEntity.ok(Map.of("mensaje", "Servicio cancelado"));
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<?> rechazar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        ofertaService.rechazar(id);
        return ResponseEntity.ok(Map.of("mensaje", "Oferta rechazada"));
    }

    private Map<String, Object> toMap(Oferta o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getIdoferta());
        m.put("precio", o.getPrecio());
        m.put("modalidad", o.getModalidad());
        m.put("tiempoEstimado", o.getTiempoEstimado());
        m.put("estado", o.getEstado());
        Tecnico tec = o.getTecnico();
        double prom = tec.getCalificacionPromedio() != null ? tec.getCalificacionPromedio().doubleValue() : 5.0;
        int servicios = tec.getServiciosRealizados() != null ? tec.getServiciosRealizados() : 0;
        m.put("tecnico", Map.of(
            "id", tec.getIdtecnico(),
            "idUsuario", tec.getUsuario().getIdUsuario(),
            "nombre", tec.getUsuario().getNombre(),
            "apellido", tec.getUsuario().getApellido(),
            "especialidades", tec.getEspecialidades() != null ? tec.getEspecialidades() : ""
        ));
        m.put("calificacionPromedio", prom);
        m.put("calificacionTotal", 0L);
        m.put("serviciosCompletados", servicios);
        m.put("garantiaMeses", o.getGarantiaMeses() != null ? o.getGarantiaMeses() : 0);
        m.put("precioTransporte", o.getPrecioTransporte() != null ? o.getPrecioTransporte() : BigDecimal.ZERO);
        m.put("descripcionOferta", o.getDescripcionOferta() != null ? o.getDescripcionOferta() : "");
        String tecUbicacion = tec.getUsuario().getUbicacion();
        m.put("tecnicoUbicacion", tecUbicacion != null ? tecUbicacion : "");
        m.put("solicitudId", o.getSolicitud().getIdsolicitud_reparacion());
        return m;
    }
}
