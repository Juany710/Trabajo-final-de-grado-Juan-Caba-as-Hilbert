package com.fixit.repository;

import com.fixit.model.Cliente;
import com.fixit.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Integer> {
    Optional<Cliente> findByUsuario(Usuario usuario);
    Optional<Cliente> findByUsuario_IdUsuario(Integer idUsuario);
}
