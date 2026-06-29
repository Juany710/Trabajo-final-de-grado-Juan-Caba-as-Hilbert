package com.fixit.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idchat;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensaje;

    @Column(nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    @Column(nullable = false, length = 15)
    private String estado = "Enviado"; // Enviado | Leido | Eliminado

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "Emisor_idUsuario", nullable = false)
    private Usuario emisor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "Receptor_idUsuario", nullable = false)
    private Usuario receptor;
}
