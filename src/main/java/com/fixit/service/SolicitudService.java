package com.fixit.service;

import com.fixit.model.*;
import com.fixit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SolicitudService {

    private final SolicitudRepository solicitudRepo;
    private final ClienteRepository clienteRepo;
    private final CategoriaRepository categoriaRepo;
    private final OfertaRepository ofertaRepo;
    private final GeocodingService geocodingService;

    public SolicitudReparacion crear(Integer usuarioId, Integer categoriaId, String detalles, String ubicacion) {
        Cliente cliente = clienteRepo.findByUsuario_IdUsuario(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo clientes pueden crear solicitudes"));
        Categoria cat = categoriaRepo.findById(categoriaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoría inválida"));

        SolicitudReparacion s = new SolicitudReparacion();
        s.setCliente(cliente);
        s.setCategoria(cat);
        s.setDetalles(detalles);
        s.setUbicacion(ubicacion);

        double[] coords = geocodingService.geocodificar(ubicacion);
        if (coords != null) { s.setLatitud(coords[0]); s.setLongitud(coords[1]); }

        return solicitudRepo.save(s);
    }

    public List<SolicitudReparacion> misSolicitudes(Integer usuarioId) {
        return clienteRepo.findByUsuario_IdUsuario(usuarioId)
                .map(c -> solicitudRepo.findByClienteId(c.getIdcliente()))
                .orElse(List.of());
    }

    public List<SolicitudReparacion> pendientes(Integer excludeUsuarioId) {
        return solicitudRepo.findByEstadoOrderByFechaSolicitudDesc("Pendiente").stream()
                .filter(s -> !s.getCliente().getUsuario().getIdUsuario().equals(excludeUsuarioId))
                .toList();
    }

    public SolicitudReparacion finalizar(Integer solicitudId, Integer clienteUsuarioId) {
        SolicitudReparacion s = solicitudRepo.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!s.getCliente().getUsuario().getIdUsuario().equals(clienteUsuarioId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el cliente puede finalizar");

        if (!"En proceso".equals(s.getEstado()) && !"PendienteConfirmacion".equals(s.getEstado()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La solicitud no está en proceso");

        s.setEstado("Finalizada");
        return solicitudRepo.save(s);
    }

    public void tecnicoFinalizo(Integer solicitudId, Integer tecnicoUsuarioId) {
        SolicitudReparacion s = solicitudRepo.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!"En proceso".equals(s.getEstado()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La solicitud no está en proceso");

        boolean esTecnicoAsignado = ofertaRepo.findBySolicitudId(solicitudId).stream()
                .anyMatch(o -> "Aceptada".equals(o.getEstado())
                        && o.getTecnico().getUsuario().getIdUsuario().equals(tecnicoUsuarioId));

        if (!esTecnicoAsignado)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No sos el técnico asignado");

        s.setEstado("PendienteConfirmacion");
        solicitudRepo.save(s);
    }

    public SolicitudReparacion actualizar(Integer solicitudId, Integer clienteUsuarioId,
                                          String detalles, String ubicacion) {
        SolicitudReparacion s = solicitudRepo.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!s.getCliente().getUsuario().getIdUsuario().equals(clienteUsuarioId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        if (!"Pendiente".equals(s.getEstado()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No podés editar una solicitud ya aceptada");

        if (detalles != null)  s.setDetalles(detalles);
        if (ubicacion != null) {
            s.setUbicacion(ubicacion);
            double[] coords = geocodingService.geocodificar(ubicacion);
            if (coords != null) { s.setLatitud(coords[0]); s.setLongitud(coords[1]); }
        }
        return solicitudRepo.save(s);
    }

    public void cancelar(Integer solicitudId, Integer clienteUsuarioId) {
        SolicitudReparacion s = solicitudRepo.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!s.getCliente().getUsuario().getIdUsuario().equals(clienteUsuarioId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        if ("Finalizada".equals(s.getEstado()) || "Cancelada".equals(s.getEstado()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se puede cancelar esta solicitud");

        s.setEstado("Cancelada");
        solicitudRepo.save(s);
    }
}
