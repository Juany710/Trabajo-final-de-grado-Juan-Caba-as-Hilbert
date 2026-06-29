package com.fixit.service;

import com.fixit.model.Chat;
import com.fixit.model.Usuario;
import com.fixit.repository.ChatRepository;
import com.fixit.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepo;
    private final UsuarioRepository usuarioRepo;

    public List<Chat> conversacion(Integer myId, Integer otroId) {
        return chatRepo.findConversacion(myId, otroId);
    }

    public Chat enviar(Integer emisorId, Integer receptorId, String mensaje) {
        Usuario emisor = usuarioRepo.findById(emisorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Emisor no encontrado"));
        Usuario receptor = usuarioRepo.findById(receptorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receptor no encontrado"));

        Chat chat = new Chat();
        chat.setEmisor(emisor);
        chat.setReceptor(receptor);
        chat.setMensaje(mensaje);
        chat.setFechaEnvio(LocalDateTime.now());
        return chatRepo.save(chat);
    }

    public List<Map<String, Object>> contactos(Integer myId) {
        List<Integer> ids = chatRepo.findContactIds(myId);
        List<Map<String, Object>> contactos = new ArrayList<>();
        for (Integer cid : ids) {
            usuarioRepo.findById(cid).ifPresent(u -> {
                Map<String, Object> c = new HashMap<>();
                c.put("userId", u.getIdUsuario());
                c.put("nombre", u.getNombre() + " " + u.getApellido());
                List<Chat> conv = chatRepo.findConversacion(myId, cid);
                if (!conv.isEmpty()) {
                    Chat last = conv.get(conv.size() - 1);
                    c.put("ultimoMensaje", last.getMensaje());
                    c.put("fecha", last.getFechaEnvio());
                }
                contactos.add(c);
            });
        }
        return contactos;
    }
}
