package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categoria")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idcategoria;

    @Column(nullable = false, length = 20)
    private String tipo; // Electronica | Electrodomestico | Vehiculo

    @Column(nullable = false, length = 15)
    private String nombre;

    @Column(length = 15)
    private String marca;

    @Column(length = 45)
    private String numeroSerie;

    @Column(length = 10)
    private String patente;

    private Integer anio;
}
