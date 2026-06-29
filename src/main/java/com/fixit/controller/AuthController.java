package com.fixit.controller;

import com.fixit.model.*;
import com.fixit.repository.*;
import com.fixit.service.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository usuarioRepo;
    private final ClienteRepository clienteRepo;
    private final TecnicoRepository tecnicoRepo;
    private final BCryptPasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    // Acceso estático para que los demás controllers no requieran refactor masivo
    private static JwtUtil staticJwtUtil;

    public AuthController(UsuarioRepository usuarioRepo, ClienteRepository clienteRepo,
                            TecnicoRepository tecnicoRepo, BCryptPasswordEncoder encoder,
                            JwtUtil jwtUtil) {
        this.usuarioRepo   = usuarioRepo;
        this.clienteRepo   = clienteRepo;
        this.tecnicoRepo   = tecnicoRepo;
        this.encoder       = encoder;
        this.jwtUtil       = jwtUtil;
        AuthController.staticJwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email    = body.get("email");
        String password = body.get("password");
        String contexto = body.getOrDefault("contexto", "");

        Optional<Usuario> opt = usuarioRepo.findByEmail(email);
        if (opt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Usuario no encontrado"));

        Usuario u = opt.get();
        if (!encoder.matches(password, u.getPassword()))
            return ResponseEntity.status(401).body(Map.of("error", "Contraseña incorrecta"));

        String tipo;
        if ("cliente".equals(contexto) && clienteRepo.findByUsuario(u).isPresent()) {
            tipo = "cliente";
        } else if ("tecnico".equals(contexto) && tecnicoRepo.findByUsuario(u).isPresent()) {
            tipo = "tecnico";
        } else {
            tipo = resolverTipo(u);
        }

        String token = jwtUtil.generarToken(u.getIdUsuario(), tipo);

        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("userId", u.getIdUsuario());
        resp.put("nombre", u.getNombre());
        resp.put("apellido", u.getApellido());
        resp.put("email", u.getEmail());
        resp.put("telefono", u.getTelefono() != null ? u.getTelefono() : "");
        resp.put("tipo", tipo);
        if ("cliente".equals(tipo)) {
            clienteRepo.findByUsuario(u).ifPresent(c -> resp.put("tipoId", c.getIdcliente()));
        } else if ("tecnico".equals(tipo)) {
            tecnicoRepo.findByUsuario(u).ifPresent(t -> resp.put("tipoId", t.getIdtecnico()));
        }
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Map<String, Object> body) {
        String email = (String) body.get("email");
        String tipo  = (String) body.get("tipo");

        if (usuarioRepo.existsByEmail(email))
            return ResponseEntity.badRequest().body(Map.of("error", "El email ya está registrado"));

        Object dniObj = body.get("dni");
        int dni = dniObj instanceof Integer i ? i : Integer.parseInt(dniObj.toString());
        if (usuarioRepo.existsByDni(dni))
            return ResponseEntity.badRequest().body(Map.of("error", "El DNI ya está registrado"));

        Usuario u = new Usuario();
        u.setNombre((String) body.get("nombre"));
        u.setApellido((String) body.get("apellido"));
        u.setDni(dni);
        u.setEmail(email);
        u.setTelefono((String) body.getOrDefault("telefono", ""));
        u.setDireccion((String) body.getOrDefault("direccion", ""));
        u.setPassword(encoder.encode((String) body.get("password")));
        usuarioRepo.save(u);

        String tipoReal = "cliente";
        if ("tecnico".equals(tipo)) {
            Tecnico t = new Tecnico();
            t.setUsuario(u);
            t.setEspecialidades((String) body.getOrDefault("especialidades", ""));
            t.setDisponibilidad(true);
            tecnicoRepo.save(t);
            tipoReal = "tecnico";
        } else {
            Cliente c = new Cliente();
            c.setUsuario(u);
            clienteRepo.save(c);
        }

        String token = jwtUtil.generarToken(u.getIdUsuario(), tipoReal);
        return ResponseEntity.ok(Map.of(
            "token", token, "userId", u.getIdUsuario(),
            "nombre", u.getNombre(), "apellido", u.getApellido(),
            "email", u.getEmail(), "telefono", u.getTelefono() != null ? u.getTelefono() : "",
            "tipo", tipoReal
        ));
    }

    @GetMapping("/check")
    public ResponseEntity<?> check(@RequestHeader("Authorization") String token) {
        if (getUserIdFromToken(token).isEmpty())
            return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/nombre")
    public ResponseEntity<?> actualizarNombre(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Optional<Usuario> opt = usuarioRepo.findById(uid.get());
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Usuario u = opt.get();
        if (body.containsKey("nombre"))   u.setNombre(body.get("nombre"));
        if (body.containsKey("apellido")) u.setApellido(body.get("apellido"));
        if (body.containsKey("telefono")) u.setTelefono(body.get("telefono"));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of(
            "nombre", u.getNombre(), "apellido", u.getApellido(),
            "telefono", u.getTelefono() != null ? u.getTelefono() : ""));
    }

    @GetMapping("/ubicacion-tecnico")
    public ResponseEntity<?> getUbicacionTecnico(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Usuario u = usuarioRepo.findById(uid.get()).orElseThrow();
        return ResponseEntity.ok(Map.of("ubicacion", u.getUbicacion() != null ? u.getUbicacion() : ""));
    }

    @PutMapping("/ubicacion-tecnico")
    public ResponseEntity<?> saveUbicacionTecnico(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Usuario u = usuarioRepo.findById(uid.get()).orElseThrow();
        u.setUbicacion(body.get("ubicacion"));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/direcciones")
    public ResponseEntity<?> getDirecciones(@RequestHeader("Authorization") String token) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Usuario u = usuarioRepo.findById(uid.get()).orElseThrow();
        String json = u.getDireccionesJson();
        return ResponseEntity.ok(Map.of("direcciones", json != null ? json : "[]"));
    }

    @PutMapping("/direcciones")
    public ResponseEntity<?> saveDirecciones(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Usuario u = usuarioRepo.findById(uid.get()).orElseThrow();
        u.setDireccionesJson(body.get("direcciones"));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/password")
    public ResponseEntity<?> cambiarPassword(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        Optional<Integer> uid = getUserIdFromToken(token);
        if (uid.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "No autorizado"));
        Optional<Usuario> opt = usuarioRepo.findById(uid.get());
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Usuario u = opt.get();
        if (!encoder.matches(body.get("actual"), u.getPassword()))
            return ResponseEntity.badRequest().body(Map.of("error", "Contraseña actual incorrecta"));
        u.setPassword(encoder.encode(body.get("nueva")));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // Helpers estáticos usados por los demás controllers
    public static Optional<Integer> getUserIdFromToken(String token) {
        if (staticJwtUtil == null) return Optional.empty();
        return staticJwtUtil.getUserId(token);
    }

    public static Optional<String> getTipoFromToken(String token) {
        if (staticJwtUtil == null) return Optional.empty();
        return staticJwtUtil.getTipo(token);
    }

    private String resolverTipo(Usuario u) {
        if (tecnicoRepo.findByUsuario(u).isPresent()) return "tecnico";
        if (clienteRepo.findByUsuario(u).isPresent()) return "cliente";
        return "soporte";
    }
}
