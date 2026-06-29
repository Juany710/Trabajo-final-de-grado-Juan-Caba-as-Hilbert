package com.fixit.repository;

import com.fixit.model.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ServicioRepository extends JpaRepository<Servicio, Integer> {
    Optional<Servicio> findByOferta_Idoferta(Integer idOferta);
}
