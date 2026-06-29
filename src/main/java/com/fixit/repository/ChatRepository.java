package com.fixit.repository;

import com.fixit.model.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Integer> {

    @Query("SELECT c FROM Chat c WHERE " +
           "(c.emisor.idUsuario = :u1 AND c.receptor.idUsuario = :u2) OR " +
           "(c.emisor.idUsuario = :u2 AND c.receptor.idUsuario = :u1) " +
           "ORDER BY c.fechaEnvio ASC")
    List<Chat> findConversacion(@Param("u1") Integer u1, @Param("u2") Integer u2);

    @Query("SELECT DISTINCT CASE WHEN c.emisor.idUsuario = :uid THEN c.receptor.idUsuario ELSE c.emisor.idUsuario END " +
           "FROM Chat c WHERE c.emisor.idUsuario = :uid OR c.receptor.idUsuario = :uid")
    List<Integer> findContactIds(@Param("uid") Integer uid);
}
