package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitud_reparacion")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudReparacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idsolicitud_reparacion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_idcliente", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_idcategoria", nullable = false)
    private Categoria categoria;

    @Column(nullable = false)
    private LocalDateTime fechaSolicitud = LocalDateTime.now();

    @Column(nullable = false, length = 20)
    private String estado = "Pendiente"; // Pendiente | En proceso | Finalizada | Cancelada

    @Column(length = 250)
    private String detalles;

    @Column(length = 100)
    private String ubicacion;

    @Column
    private Double latitud;

    @Column
    private Double longitud;
}
