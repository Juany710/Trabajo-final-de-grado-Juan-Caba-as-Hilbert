package com.fixit.controller;

import com.fixit.model.*;
import com.fixit.repository.*;
import com.fixit.service.SolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/solicitudes")
@RequiredArgsConstructor
public class SolicitudController {

    private final SolicitudRepository solicitudRepo;
    private final ClienteRepository clienteRepo;
    private final OfertaRepository ofertaRepo;
    private final TecnicoRepository tecnicoRepo;
    private final CalificacionRepository calificacionRepo;
    private final SolicitudService solicitudService;

    @PostMapping
    public ResponseEntity<?> crear(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody Map<String, Object> body) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));

        SolicitudReparacion s = solicitudService.crear(
            uid.get(),
            (Integer) body.get("categoriaId"),
            (String) body.get("detalles"),
            (String) body.get("ubicacion")
        );
        return ResponseEntity.ok(toMap(s));
    }

    @GetMapping("/cliente/{userId}/stats")
    public ResponseEntity<?> clienteStats(@PathVariable Integer userId) {
        long total = solicitudRepo.countByClienteUsuarioId(userId);
        Double promedio = calificacionRepo.promedioEstrellasCtx(userId, "cliente");
        Long totalCal  = calificacionRepo.totalCalificacionesCtx(userId, "cliente");
        return ResponseEntity.ok(Map.of(
            "totalSolicitudes", total,
            "calificacionPromedio", promedio != null ? promedio : 5.0,
            "totalCalificaciones", totalCal != null ? totalCal : 0
        ));
    }

    @GetMapping("/mis-solicitudes")
    public ResponseEntity<?> misSolicitudes(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        return ResponseEntity.ok(
            solicitudService.misSolicitudes(uid.get()).stream().map(this::toMap).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        SolicitudReparacion s = solicitudService.actualizar(
            id, uid.get(),
            (String) body.get("detalles"),
            (String) body.get("ubicacion")
        );
        return ResponseEntity.ok(toMap(s));
    }

    @PutMapping("/{id}/finalizar")
    public ResponseEntity<?> finalizar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));

        SolicitudReparacion s = solicitudService.finalizar(id, uid.get());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("solicitudId", id);
        ofertaRepo.findBySolicitudId(id).stream()
                .filter(o -> "Aceptada".equals(o.getEstado()))
                .findFirst()
                .ifPresent(o -> {
                    result.put("tecnicoIdUsuario", o.getTecnico().getUsuario().getIdUsuario());
                    result.put("tecnicoNombre", o.getTecnico().getUsuario().getNombre()
                            + " " + o.getTecnico().getUsuario().getApellido());
                    result.put("clienteIdUsuario", s.getCliente().getUsuario().getIdUsuario());
                    result.put("clienteNombre", s.getCliente().getUsuario().getNombre()
                            + " " + s.getCliente().getUsuario().getApellido());
                });
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelar(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        solicitudService.cancelar(id, uid.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/{id}/tecnico-finalizo")
    public ResponseEntity<?> tecnicoFinalizo(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        solicitudService.tecnicoFinalizo(id, uid.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/mis-trabajos")
    public ResponseEntity<?> misTrabajos(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Optional<Tecnico> tec = tecnicoRepo.findByUsuario_IdUsuario(uid.get());
        if (tec.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(
            ofertaRepo.findAceptadasByTecnico(tec.get().getIdtecnico()).stream()
                .filter(o -> List.of("En proceso", "PendienteConfirmacion", "Finalizada").contains(o.getSolicitud().getEstado()))
                .map(o -> toMap(o.getSolicitud()))
                .toList());
    }

    @GetMapping("/finalizadas/count")
    public ResponseEntity<?> finalizadasCount(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        long count;
        if ("tecnico".equals(AuthController.getTipoFromToken(token).orElse(""))) {
            Optional<Tecnico> tec = tecnicoRepo.findByUsuario_IdUsuario(uid.get());
            count = tec.isEmpty() ? 0 : ofertaRepo.findAceptadasByTecnico(tec.get().getIdtecnico())
                .stream().filter(o -> "Finalizada".equals(o.getSolicitud().getEstado())).count();
        } else {
            Optional<Cliente> cli = clienteRepo.findByUsuario_IdUsuario(uid.get());
            count = cli.isEmpty() ? 0 : solicitudRepo.findByClienteId(cli.get().getIdcliente())
                .stream().filter(s -> "Finalizada".equals(s.getEstado())).count();
        }
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/pendientes")
    public List<Map<String, Object>> pendientes(
            @RequestHeader(value = "Authorization", required = false) String token) {
        Integer uid = AuthController.getUserIdFromToken(token).orElse(-1);
        return solicitudService.pendientes(uid).stream().map(this::toMap).toList();
    }

    @GetMapping("/geocodificar-pendientes")
    public ResponseEntity<?> geocodificarPendientes() throws InterruptedException {
        List<SolicitudReparacion> pendientes = solicitudRepo.findByEstadoOrderByFechaSolicitudDesc("Pendiente");
        int ok = 0, skip = 0;
        for (SolicitudReparacion s : pendientes) {
            if (s.getLatitud() != null && s.getLongitud() != null) { skip++; continue; }
            if (s.getUbicacion() == null || s.getUbicacion().isBlank()) { skip++; continue; }
            SolicitudReparacion actualizado = solicitudService.actualizar(
                s.getIdsolicitud_reparacion(),
                s.getCliente().getUsuario().getIdUsuario(),
                null, s.getUbicacion()
            );
            if (actualizado.getLatitud() != null) ok++; else skip++;
            Thread.sleep(1100);
        }
        return ResponseEntity.ok(Map.of("geocodificadas", ok, "omitidas", skip));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Integer id) {
        return solicitudRepo.findById(id)
                .map(s -> ResponseEntity.ok(toMap(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(SolicitudReparacion s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getIdsolicitud_reparacion());
        m.put("estado", s.getEstado());
        m.put("detalles", s.getDetalles());
        m.put("ubicacion", s.getUbicacion());
        m.put("latitud", s.getLatitud());
        m.put("longitud", s.getLongitud());
        m.put("fechaSolicitud", s.getFechaSolicitud());
        m.put("categoria", Map.of(
            "id", s.getCategoria().getIdcategoria(),
            "nombre", s.getCategoria().getNombre(),
            "tipo", s.getCategoria().getTipo()
        ));
        m.put("cliente", Map.of(
            "id", s.getCliente().getIdcliente(),
            "idUsuario", s.getCliente().getUsuario().getIdUsuario(),
            "nombre", s.getCliente().getUsuario().getNombre(),
            "apellido", s.getCliente().getUsuario().getApellido()
        ));
        ofertaRepo.findBySolicitudId(s.getIdsolicitud_reparacion()).stream()
            .filter(o -> "Aceptada".equals(o.getEstado()))
            .findFirst()
            .ifPresent(o -> m.put("tecnicoNombre",
                o.getTecnico().getUsuario().getNombre() + " " + o.getTecnico().getUsuario().getApellido()));
        return m;
    }
}
