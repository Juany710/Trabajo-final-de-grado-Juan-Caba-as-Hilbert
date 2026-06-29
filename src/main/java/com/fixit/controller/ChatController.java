package com.fixit.controller;

import com.fixit.model.Chat;
import com.fixit.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/{otroUserId}")
    public ResponseEntity<?> conversacion(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer otroUserId) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        return ResponseEntity.ok(chatService.conversacion(uid.get(), otroUserId).stream().map(this::toMap).toList());
    }

    @PostMapping
    public ResponseEntity<?> enviar(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {

        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));

        Integer receptorId = (Integer) body.get("receptorId");
        Chat chat = chatService.enviar(uid.get(), receptorId, (String) body.get("mensaje"));

        Map<String, Object> msg = toMap(chat);
        messagingTemplate.convertAndSendToUser(receptorId.toString(), "/queue/messages", msg);
        return ResponseEntity.ok(msg);
    }

    @GetMapping("/contactos")
    public ResponseEntity<?> contactos(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = AuthController.getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        return ResponseEntity.ok(chatService.contactos(uid.get()));
    }

    private Map<String, Object> toMap(Chat c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getIdchat());
        m.put("mensaje", c.getMensaje());
        m.put("fechaEnvio", c.getFechaEnvio());
        m.put("estado", c.getEstado());
        m.put("emisorId", c.getEmisor().getIdUsuario());
        m.put("emisorNombre", c.getEmisor().getNombre());
        m.put("receptorId", c.getReceptor().getIdUsuario());
        return m;
    }
}
