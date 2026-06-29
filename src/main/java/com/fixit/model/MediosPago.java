package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "MediosPago")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediosPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idMediosPago;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_idcliente", nullable = false)
    private Cliente cliente;

    @Column(nullable = false, length = 15)
    private String tipo; // Tarjeta | Billetera

    @Column(length = 45)
    private String numeroTarjeta;

    @Column(length = 45)
    private String titularTarjeta;

    private LocalDate fechaVencimiento;

    @Column(length = 15)
    private String proveedorBilletera;
}
