package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "soporte")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Soporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idsoporte;

    @OneToOne
    @JoinColumn(name = "Usuario_idUsuario", unique = true, nullable = false)
    private Usuario usuario;
}
