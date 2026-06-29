package com.fixit.repository;

import com.fixit.model.SolicitudReparacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SolicitudRepository extends JpaRepository<SolicitudReparacion, Integer> {

    @Query("SELECT s FROM SolicitudReparacion s WHERE s.cliente.idcliente = :id ORDER BY s.fechaSolicitud DESC")
    List<SolicitudReparacion> findByClienteId(@Param("id") Integer id);

    List<SolicitudReparacion> findByEstadoOrderByFechaSolicitudDesc(String estado);

    @Query("SELECT COUNT(s) FROM SolicitudReparacion s WHERE s.cliente.usuario.idUsuario = :userId")
    long countByClienteUsuarioId(@Param("userId") Integer userId);

    @Query("SELECT s FROM SolicitudReparacion s WHERE s.categoria.tipo = :tipo AND s.estado = :estado ORDER BY s.fechaSolicitud DESC")
    List<SolicitudReparacion> findByTipoAndEstado(@Param("tipo") String tipo, @Param("estado") String estado);
}
