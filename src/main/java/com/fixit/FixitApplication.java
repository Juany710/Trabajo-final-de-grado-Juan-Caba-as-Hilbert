package com.fixit;

import com.fixit.model.*;
import com.fixit.repository.*;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@SpringBootApplication
@OpenAPIDefinition(info = @Info(
    title       = "FIXIT API",
    version     = "1.0",
    description = "Plataforma de conexión entre clientes y técnicos de reparación",
    contact     = @Contact(name = "Juany Hilbert", email = "juanyhilbert710@gmail.com")
))
public class FixitApplication {

    public static void main(String[] args) {
        SpringApplication.run(FixitApplication.class, args);
    }

    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CommandLineRunner initData(
            UsuarioRepository usuarioRepo,
            ClienteRepository clienteRepo,
            TecnicoRepository tecnicoRepo,
            CategoriaRepository categoriaRepo,
            SolicitudRepository solicitudRepo,
            OfertaRepository ofertaRepo,
            ServicioRepository servicioRepo,
            CalificacionRepository calificacionRepo,
            ChatRepository chatRepo,
            BCryptPasswordEncoder encoder) {
        return args -> {
            if (categoriaRepo.count() > 0) return;

            // ── Categorías ────────────────────────────────────────────────
            Categoria cel  = cat(categoriaRepo, "Electronica",    "Celular");
            Categoria comp = cat(categoriaRepo, "Electronica",    "Computadora");
            Categoria hela = cat(categoriaRepo, "Electrodomestico","Heladera");
            Categoria lava = cat(categoriaRepo, "Electrodomestico","Lavarropas");
            Categoria auto = cat(categoriaRepo, "Vehiculo",       "Auto");
            Categoria moto = cat(categoriaRepo, "Vehiculo",       "Moto");

            String pass = encoder.encode("123456");

            // ── Clientes ──────────────────────────────────────────────────
            Cliente cJuan    = cliente(usuarioRepo, clienteRepo, "Juan",    "Pérez",   12345678, "juan@fixit.com",    "351-1234567", "Av. Colón 1234, Córdoba", pass);
            Cliente cMaría   = cliente(usuarioRepo, clienteRepo, "María",   "González",98765432, "maria@fixit.com",   "351-2345678", "Bv. Chacabuco 800, Córdoba", pass);
            Cliente cLucas   = cliente(usuarioRepo, clienteRepo, "Lucas",   "Fernández",11223345,"lucas@fixit.com",   "351-3456789", "Calle Dean Funes 300, Córdoba", pass);

            // ── Técnicos ──────────────────────────────────────────────────
            Tecnico tOlivia  = tecnico(usuarioRepo, tecnicoRepo, "Olivia",  "Pérez",   87654321, "olivia@fixit.com",  "351-7654321", "Bv. San Juan 500, Córdoba",      pass, "Electrónica, Celulares, iPhone",         4.8, 23);
            Tecnico tCarlos  = tecnico(usuarioRepo, tecnicoRepo, "Carlos",  "García",  11223344, "carlos@fixit.com",  "351-9876543", "Ruta 9 km 5, Córdoba",           pass, "Electrodomésticos, Heladeras, Lavarropas",4.6, 18);
            Tecnico tRosana  = tecnico(usuarioRepo, tecnicoRepo, "Rosana",  "Rojas",   55667788, "rosana@fixit.com",  "351-5556677", "Los Plátanos 200, Córdoba",       pass, "Vehículos, Mecánica general, Diagnóstico",4.9, 31);
            Tecnico tMiguel  = tecnico(usuarioRepo, tecnicoRepo, "Miguel",  "Torres",  44556677, "miguel@fixit.com",  "351-4445566", "Av. Vélez Sársfield 1200, Córdoba",pass,"Computadoras, Redes, Software",          4.7, 12);

            // ── Solicitudes con distintos estados ─────────────────────────
            // Pendientes (visibles en el mapa para los técnicos)
            solicitud(solicitudRepo, cMaría,  cel,  "Pantalla rota, no responde al tacto",           "Bv. Chacabuco 800, Córdoba",   -31.4135, -64.1856, "Pendiente",              LocalDateTime.now().minusHours(2));
            solicitud(solicitudRepo, cLucas,  comp, "No enciende, hace ruido al arrancar",           "Dean Funes 300, Córdoba",       -31.4020, -64.1910, "Pendiente",              LocalDateTime.now().minusHours(5));
            solicitud(solicitudRepo, cMaría,  auto, "Batería descargada, no arranca",                "Av. Colón 2400, Córdoba",       -31.4200, -64.1780, "Pendiente",              LocalDateTime.now().minusMinutes(40));

            // En proceso — Juan con Olivia
            SolicitudReparacion sEnProceso = solicitud(solicitudRepo, cJuan, hela,
                "Heladera no enfría, hace ruido extraño", "Av. Colón 1234, Córdoba", -31.4089, -64.1897, "En proceso", LocalDateTime.now().minusDays(2));
            Oferta oAceptada = oferta(ofertaRepo, sEnProceso, tOlivia, "4500.00", "Presencial", "2-3 días", 3, "150.00", "Reviso compresor y gas refrigerante", "Aceptada");
            servicio(servicioRepo, oAceptada, LocalDateTime.now().minusDays(2));

            // PendienteConfirmacion — Lucas con Carlos
            SolicitudReparacion sPendConf = solicitud(solicitudRepo, cLucas, lava,
                "No centrifuga y gotea agua por abajo", "Dean Funes 300, Córdoba", -31.4020, -64.1910, "PendienteConfirmacion", LocalDateTime.now().minusDays(4));
            Oferta oPendConf = oferta(ofertaRepo, sPendConf, tCarlos, "3200.00", "Presencial", "1-2 días", 6, "0.00", "Cambio de rodamientos y sello de tina", "Aceptada");
            servicio(servicioRepo, oPendConf, LocalDateTime.now().minusDays(3));

            // Finalizadas — para que ganancias muestre datos
            finalizarConCalificacion(solicitudRepo, ofertaRepo, servicioRepo, calificacionRepo,
                cJuan, tCarlos, moto, "Cambio de aceite y filtros", "Ruta 9 km 5, Córdoba", -31.4300, -64.1650,
                "2800.00", "0.00", "Revisión completa y cambio de aceite",
                LocalDateTime.now().minusDays(10), 5, "Excelente trabajo, muy puntual");

            finalizarConCalificacion(solicitudRepo, ofertaRepo, servicioRepo, calificacionRepo,
                cMaría, tOlivia, cel, "iPhone 12 no carga ni con cargador original", "Bv. Chacabuco 800, Córdoba", -31.4135, -64.1856,
                "6500.00", "200.00", "Cambio de conector lightning y limpieza interna",
                LocalDateTime.now().minusDays(20), 5, "Lo mejor del mercado, lo recomiendo 100%");

            finalizarConCalificacion(solicitudRepo, ofertaRepo, servicioRepo, calificacionRepo,
                cLucas, tRosana, auto, "Frenos raspando y volante vibra en ruta", "Dean Funes 300, Córdoba", -31.4020, -64.1910,
                "12000.00", "0.00", "Cambio de pastillas, discos y balanceo",
                LocalDateTime.now().minusDays(35), 4, "Muy buen trabajo, demoró un poco más de lo esperado");

            finalizarConCalificacion(solicitudRepo, ofertaRepo, servicioRepo, calificacionRepo,
                cJuan, tMiguel, comp, "Laptop muy lenta, se congela constantemente", "Av. Colón 1234, Córdoba", -31.4089, -64.1897,
                "4500.00", "0.00", "Formateo, SSD nuevo y reinstalación de Windows",
                LocalDateTime.now().minusDays(45), 5, "Increíble, como nueva. Totalmente recomendado");

            // ── Chats de demo ─────────────────────────────────────────────
            chat(chatRepo, cJuan.getUsuario(), tOlivia.getUsuario(), "Hola Olivia, ¿puedo darte más detalles de la heladera?",       LocalDateTime.now().minusHours(47));
            chat(chatRepo, tOlivia.getUsuario(), cJuan.getUsuario(), "¡Hola Juan! Claro, contame qué síntomas tiene.",                LocalDateTime.now().minusHours(46));
            chat(chatRepo, cJuan.getUsuario(), tOlivia.getUsuario(), "Hace un ruido como un golpeteo y el freezer no congela bien.",   LocalDateTime.now().minusHours(46));
            chat(chatRepo, tOlivia.getUsuario(), cJuan.getUsuario(), "Entendido. Probablemente sea el compresor. Paso mañana a las 10.", LocalDateTime.now().minusHours(45));

            System.out.println("✅ FIXIT — Datos de demo cargados correctamente.");
            System.out.println("   Cliente:  juan@fixit.com   / 123456");
            System.out.println("   Técnico:  olivia@fixit.com / 123456");
            System.out.println("   Swagger:  http://localhost:8080/swagger-ui.html");
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Categoria cat(CategoriaRepository repo, String tipo, String nombre) {
        Categoria c = new Categoria(); c.setTipo(tipo); c.setNombre(nombre); return repo.save(c);
    }

    private Cliente cliente(UsuarioRepository uRepo, ClienteRepository cRepo,
                            String nombre, String apellido, int dni, String email,
                            String tel, String dir, String pass) {
        Usuario u = new Usuario();
        u.setNombre(nombre); u.setApellido(apellido); u.setDni(dni);
        u.setEmail(email); u.setTelefono(tel); u.setDireccion(dir); u.setPassword(pass);
        uRepo.save(u);
        Cliente c = new Cliente(); c.setUsuario(u); return cRepo.save(c);
    }

    private Tecnico tecnico(UsuarioRepository uRepo, TecnicoRepository tRepo,
                            String nombre, String apellido, int dni, String email,
                            String tel, String dir, String pass,
                            String especialidades, double prom, int servicios) {
        Usuario u = new Usuario();
        u.setNombre(nombre); u.setApellido(apellido); u.setDni(dni);
        u.setEmail(email); u.setTelefono(tel); u.setDireccion(dir); u.setPassword(pass);
        uRepo.save(u);
        Tecnico t = new Tecnico(); t.setUsuario(u);
        t.setEspecialidades(especialidades); t.setDisponibilidad(true);
        t.setCalificacionPromedio(BigDecimal.valueOf(prom));
        t.setServiciosRealizados(servicios);
        return tRepo.save(t);
    }

    private SolicitudReparacion solicitud(SolicitudRepository repo,
                                          Cliente cliente, Categoria cat,
                                          String detalles, String ubicacion,
                                          Double lat, Double lon, String estado,
                                          LocalDateTime fecha) {
        SolicitudReparacion s = new SolicitudReparacion();
        s.setCliente(cliente); s.setCategoria(cat); s.setDetalles(detalles);
        s.setUbicacion(ubicacion); s.setLatitud(lat); s.setLongitud(lon);
        s.setEstado(estado); s.setFechaSolicitud(fecha);
        return repo.save(s);
    }

    private Oferta oferta(OfertaRepository repo, SolicitudReparacion sol, Tecnico tec,
                          String precio, String modalidad, String tiempo, int garantia,
                          String transporte, String descripcion, String estado) {
        Oferta o = new Oferta();
        o.setSolicitud(sol); o.setTecnico(tec);
        o.setPrecio(new BigDecimal(precio));
        o.setModalidad(modalidad); o.setTiempoEstimado(tiempo);
        o.setGarantiaMeses(garantia);
        o.setPrecioTransporte(new BigDecimal(transporte));
        o.setDescripcionOferta(descripcion); o.setEstado(estado);
        return repo.save(o);
    }

    private void servicio(ServicioRepository repo, Oferta oferta, LocalDateTime inicio) {
        Servicio s = new Servicio(); s.setOferta(oferta); s.setFechaInicio(inicio); repo.save(s);
    }

    private void finalizarConCalificacion(
            SolicitudRepository solRepo, OfertaRepository ofRepo,
            ServicioRepository srvRepo, CalificacionRepository calRepo,
            Cliente cliente, Tecnico tecnico, Categoria cat,
            String detalles, String ubicacion, Double lat, Double lon,
            String precio, String transporte, String descripcion,
            LocalDateTime fecha, int estrellas, String opinion) {

        SolicitudReparacion sol = solicitud(solRepo, cliente, cat, detalles, ubicacion, lat, lon,
                "Finalizada", fecha);
        Oferta of = oferta(ofRepo, sol, tecnico, precio, "Presencial", "1-2 días", 3,
                transporte, descripcion, "Aceptada");
        servicio(srvRepo, of, fecha.plusHours(2));

        Calificacion cal = new Calificacion();
        cal.setAutor(cliente.getUsuario()); cal.setDestinatario(tecnico.getUsuario());
        cal.setEstrellas(estrellas); cal.setOpinion(opinion);
        cal.setFechaCalificacion(fecha.plusDays(1)); calRepo.save(cal);
    }

    private void chat(ChatRepository repo, Usuario emisor, Usuario receptor,
                      String mensaje, LocalDateTime fecha) {
        Chat c = new Chat();
        c.setEmisor(emisor); c.setReceptor(receptor);
        c.setMensaje(mensaje); c.setFechaEnvio(fecha);
        repo.save(c);
    }
}
