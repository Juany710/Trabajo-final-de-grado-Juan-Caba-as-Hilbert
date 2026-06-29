package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "calificacion")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Calificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idcalificacion;

    @Column(nullable = false)
    private Integer estrellas; // 1 a 5

    @Column(length = 90)
    private String opinion;

    @Column(nullable = false)
    private LocalDateTime fechaCalificacion = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "Autor_idUsuario", nullable = false)
    private Usuario autor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "Destinatario_idUsuario", nullable = false)
    private Usuario destinatario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitud_idsolicitud")
    private SolicitudReparacion solicitud;

    // 'tecnico' = rating dado al técnico por su trabajo; 'cliente' = rating dado al cliente
    @Column(length = 10, nullable = false)
    private String contexto = "tecnico";
}
