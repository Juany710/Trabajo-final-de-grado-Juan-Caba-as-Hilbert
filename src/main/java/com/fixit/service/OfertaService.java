package com.fixit.service;

import com.fixit.model.*;
import com.fixit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OfertaService {

    private final OfertaRepository ofertaRepo;
    private final SolicitudRepository solicitudRepo;
    private final TecnicoRepository tecnicoRepo;
    private final ServicioRepository servicioRepo;

    public Oferta hacerOferta(Integer tecnicoUsuarioId, Integer solicitudId, Map<String, Object> datos) {
        Tecnico tec = tecnicoRepo.findByUsuario_IdUsuario(tecnicoUsuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo técnicos pueden hacer ofertas"));

        SolicitudReparacion sol = solicitudRepo.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Oferta o = new Oferta();
        o.setSolicitud(sol);
        o.setTecnico(tec);
        o.setPrecio(new BigDecimal(datos.get("precio").toString()));
        o.setModalidad((String) datos.getOrDefault("modalidad", "Presencial"));
        o.setTiempoEstimado((String) datos.getOrDefault("tiempoEstimado", "3-4 días"));
        Object gt = datos.get("garantiaMeses");
        o.setGarantiaMeses(gt != null ? Integer.parseInt(gt.toString()) : 0);
        Object pt = datos.get("precioTransporte");
        o.setPrecioTransporte(pt != null ? new BigDecimal(pt.toString()) : BigDecimal.ZERO);
        o.setDescripcionOferta((String) datos.getOrDefault("descripcionOferta", ""));
        return ofertaRepo.save(o);
    }

    public Servicio aceptar(Integer ofertaId) {
        Oferta o = ofertaRepo.findById(ofertaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        o.setEstado("Aceptada");
        ofertaRepo.save(o);

        SolicitudReparacion s = o.getSolicitud();
        s.setEstado("En proceso");
        solicitudRepo.save(s);

        Servicio srv = new Servicio();
        srv.setOferta(o);
        srv.setFechaInicio(LocalDateTime.now());
        return servicioRepo.save(srv);
    }

    public void rechazar(Integer ofertaId) {
        Oferta o = ofertaRepo.findById(ofertaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        o.setEstado("Rechazada");
        ofertaRepo.save(o);
    }

    public void cancelar(Integer ofertaId) {
        Oferta o = ofertaRepo.findById(ofertaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        o.setEstado("Cancelada");
        ofertaRepo.save(o);

        SolicitudReparacion s = o.getSolicitud();
        s.setEstado("Pendiente");
        solicitudRepo.save(s);

        servicioRepo.findByOferta_Idoferta(ofertaId).ifPresent(servicioRepo::delete);
    }
}
