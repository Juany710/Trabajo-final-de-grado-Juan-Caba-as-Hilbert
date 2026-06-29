package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "Usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idUsuario;

    @Column(nullable = false, length = 45)
    private String nombre;

    @Column(nullable = false, length = 45)
    private String apellido;

    @Column(nullable = false, unique = true)
    private Integer dni;

    @Column(length = 45)
    private String direccion;

    @Column(nullable = false, unique = true, length = 45)
    private String email;

    @Column(length = 20)
    private String telefono;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "direcciones_json", columnDefinition = "TEXT")
    private String direccionesJson;

    @Column(name = "ubicacion", length = 255)
    private String ubicacion;
}
