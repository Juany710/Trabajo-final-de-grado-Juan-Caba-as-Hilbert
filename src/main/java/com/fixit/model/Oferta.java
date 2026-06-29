package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "oferta")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Oferta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idoferta;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "solicitud_reparacion_idsolicitud", nullable = false)
    private SolicitudReparacion solicitud;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tecnico_idtecnico", nullable = false)
    private Tecnico tecnico;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(nullable = false, length = 15)
    private String modalidad; // Presencial | Remoto

    @Column(length = 45)
    private String tiempoEstimado;

    @Column(nullable = false, length = 15)
    private String estado = "Pendiente"; // Pendiente | Aceptada | Rechazada

    @Column(name = "garantia_meses", nullable = false)
    private Integer garantiaMeses = 0;

    @Column(name = "precio_transporte", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioTransporte = BigDecimal.ZERO;

    @Column(name = "descripcion_oferta", columnDefinition = "TEXT")
    private String descripcionOferta;
}
