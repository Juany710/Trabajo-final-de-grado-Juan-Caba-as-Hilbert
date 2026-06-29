package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tecnico")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tecnico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idtecnico;

    @OneToOne
    @JoinColumn(name = "Usuario_idUsuario", unique = true, nullable = false)
    private Usuario usuario;

    @Column(length = 255)
    private String especialidades;

    @Column(columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean disponibilidad = true;

    @Column(name = "servicios_realizados")
    private Integer serviciosRealizados = 0;

    @Column(name = "calificacion_promedio", precision = 3, scale = 2)
    private java.math.BigDecimal calificacionPromedio = java.math.BigDecimal.valueOf(5.0);

    @Column
    private Double latitud;

    @Column
    private Double longitud;
}
