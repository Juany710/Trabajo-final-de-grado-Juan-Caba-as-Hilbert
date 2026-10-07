package com.fixit.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class SolicitudControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private String tokenCliente;
    private Integer categoriaId;

    @BeforeEach
    void setup() throws Exception {
        // Registrar cliente
        MvcResult res = mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "nombre", "Laura", "apellido", "Torres", "dni", 77777777,
                    "email", "laura.sol@fixit.com", "password", "123456", "tipo", "cliente"
                )))).andReturn();
        tokenCliente = mapper.readTree(res.getResponse().getContentAsString()).get("token").asText();

        // Obtener una categoría existente (creada por el CommandLineRunner)
        MvcResult cats = mvc.perform(get("/api/categorias")).andReturn();
        JsonNode arr = mapper.readTree(cats.getResponse().getContentAsString());
        categoriaId = arr.get(0).get("idcategoria").asInt();
    }

    @Test
    void crearSolicitud() throws Exception {
        mvc.perform(post("/api/solicitudes")
                .header("Authorization", tokenCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "categoriaId", categoriaId,
                    "detalles", "Mi celular no enciende",
                    "ubicacion", "Av. Colón 1234, Córdoba"
                ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.estado").value("Pendiente"))
                .andExpect(jsonPath("$.detalles").value("Mi celular no enciende"));
    }

    @Test
    void sinTokenFalla() throws Exception {
        mvc.perform(post("/api/solicitudes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "categoriaId", categoriaId,
                    "detalles", "Test", "ubicacion", "Test"
                ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void misSolicitudesDevuelveLista() throws Exception {
        // Crear una solicitud
        mvc.perform(post("/api/solicitudes")
                .header("Authorization", tokenCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "categoriaId", categoriaId,
                    "detalles", "Heladera no enfría",
                    "ubicacion", "Bv. San Juan 500, Córdoba"
                )))).andExpect(status().isOk());

        // Verificar que aparece en mis-solicitudes
        mvc.perform(get("/api/solicitudes/mis-solicitudes")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void pendientesExcluyeAlPropioCliente() throws Exception {
        // Crear solicitud como cliente
        mvc.perform(post("/api/solicitudes")
                .header("Authorization", tokenCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "categoriaId", categoriaId,
                    "detalles", "Auto no arranca",
                    "ubicacion", "Ruta 9 km 5, Córdoba"
                )))).andExpect(status().isOk());

        // El mismo cliente no debe ver su propia solicitud en pendientes
        mvc.perform(get("/api/solicitudes/pendientes")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.detalles == 'Auto no arranca')]").isEmpty());
    }
}
