package com.fixit.repository;

import com.fixit.model.Calificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CalificacionRepository extends JpaRepository<Calificacion, Integer> {
    List<Calificacion> findByDestinatario_IdUsuarioOrderByFechaCalificacionDesc(Integer idUsuario);

    @Query("SELECT AVG(c.estrellas) FROM Calificacion c WHERE c.destinatario.idUsuario = :uid")
    Double promedioEstrellas(@Param("uid") Integer uid);

    @Query("SELECT COUNT(c) FROM Calificacion c WHERE c.destinatario.idUsuario = :uid")
    Long totalCalificaciones(@Param("uid") Integer uid);

    @Query("SELECT c FROM Calificacion c WHERE c.autor.idUsuario = :autorId AND c.solicitud.idsolicitud_reparacion = :solicitudId")
    java.util.Optional<Calificacion> findByAutorAndSolicitud(@Param("autorId") Integer autorId, @Param("solicitudId") Integer solicitudId);

    List<Calificacion> findByDestinatario_IdUsuarioAndContextoOrderByFechaCalificacionDesc(Integer idUsuario, String contexto);

    @Query("SELECT AVG(c.estrellas) FROM Calificacion c WHERE c.destinatario.idUsuario = :uid AND c.contexto = :ctx")
    Double promedioEstrellasCtx(@Param("uid") Integer uid, @Param("ctx") String ctx);

    @Query("SELECT COUNT(c) FROM Calificacion c WHERE c.destinatario.idUsuario = :uid AND c.contexto = :ctx")
    Long totalCalificacionesCtx(@Param("uid") Integer uid, @Param("ctx") String ctx);
}
