package com.fixit.repository;

import com.fixit.model.Tecnico;
import com.fixit.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TecnicoRepository extends JpaRepository<Tecnico, Integer> {
    Optional<Tecnico> findByUsuario(Usuario usuario);
    Optional<Tecnico> findByUsuario_IdUsuario(Integer idUsuario);
    List<Tecnico> findByDisponibilidadTrue();

    @Query("SELECT t FROM Tecnico t WHERE t.disponibilidad = true AND " +
           "(LOWER(t.especialidades) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(t.usuario.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(t.usuario.apellido) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Tecnico> buscar(@Param("q") String q);
}
