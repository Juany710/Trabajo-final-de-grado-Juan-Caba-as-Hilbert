package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cliente")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idcliente;

    @OneToOne
    @JoinColumn(name = "Usuario_idUsuario", unique = true, nullable = false)
    private Usuario usuario;
}
