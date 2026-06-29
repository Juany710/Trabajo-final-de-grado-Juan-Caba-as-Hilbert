package com.fixit.repository;

import com.fixit.model.Oferta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OfertaRepository extends JpaRepository<Oferta, Integer> {
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Oferta o WHERE o.solicitud.idsolicitud_reparacion = :idSolicitud")
    List<Oferta> findBySolicitudId(@org.springframework.data.repository.query.Param("idSolicitud") Integer idSolicitud);
    List<Oferta> findByTecnico_Idtecnico(Integer idTecnico);
    List<Oferta> findByTecnico_IdtecnicoAndEstado(Integer idTecnico, String estado);

    @org.springframework.data.jpa.repository.Query(
        "SELECT o FROM Oferta o WHERE o.tecnico.idtecnico = :id AND o.estado = 'Aceptada' ORDER BY o.solicitud.fechaSolicitud DESC")
    List<Oferta> findAceptadasByTecnico(@org.springframework.data.repository.query.Param("id") Integer idTecnico);
}
