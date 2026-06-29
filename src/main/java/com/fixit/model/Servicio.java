package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "servicio")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Servicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idservicio;

    @OneToOne
    @JoinColumn(name = "oferta_idoferta", nullable = false, unique = true)
    private Oferta oferta;

    @Column(nullable = false, length = 15)
    private String estado = "Iniciado"; // Iniciado | En curso | Finalizado | Cancelado

    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
}
