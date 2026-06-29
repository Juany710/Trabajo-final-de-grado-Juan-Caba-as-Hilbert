package com.fixit.controller;

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
class OfertaControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private String tokenCliente;
    private String tokenTecnico;
    private Integer solicitudId;
    private Integer categoriaId;

    @BeforeEach
    void setup() throws Exception {
        // Registrar cliente
        MvcResult resCli = mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "nombre", "Marta", "apellido", "Ruiz", "dni", 88888881,
                    "email", "marta.of@fixit.com", "password", "123456", "tipo", "cliente"
                )))).andReturn();
        tokenCliente = mapper.readTree(resCli.getResponse().getContentAsString()).get("token").asText();

        // Registrar técnico
        MvcResult resTec = mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "nombre", "Roberto", "apellido", "Silva", "dni", 88888882,
                    "email", "roberto.of@fixit.com", "password", "123456",
                    "tipo", "tecnico", "especialidades", "Electrodomésticos"
                )))).andReturn();
        tokenTecnico = mapper.readTree(resTec.getResponse().getContentAsString()).get("token").asText();

        // Obtener categoría
        MvcResult cats = mvc.perform(get("/api/categorias")).andReturn();
        categoriaId = mapper.readTree(cats.getResponse().getContentAsString()).get(0).get("id").asInt();

        // Crear solicitud como cliente
        MvcResult resSol = mvc.perform(post("/api/solicitudes")
                .header("Authorization", tokenCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "categoriaId", categoriaId,
                    "detalles", "Lavarropas no centrifuga",
                    "ubicacion", "Los Plátanos 200, Córdoba"
                )))).andReturn();
        solicitudId = mapper.readTree(resSol.getResponse().getContentAsString()).get("id").asInt();
    }

    @Test
    void tecnicoHaceOferta() throws Exception {
        mvc.perform(post("/api/ofertas/solicitud/" + solicitudId)
                .header("Authorization", tokenTecnico)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "precio", 3500, "modalidad", "Presencial",
                    "tiempoEstimado", "2-3 días", "garantiaMeses", 1
                ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Pendiente"))
                .andExpect(jsonPath("$.precio").value(3500));
    }

    @Test
    void clienteAceptaOfertaYSolicitudPasaAEnProceso() throws Exception {
        // Técnico hace oferta
        MvcResult resOf = mvc.perform(post("/api/ofertas/solicitud/" + solicitudId)
                .header("Authorization", tokenTecnico)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "precio", 5000, "modalidad", "Presencial", "tiempoEstimado", "1 día"
                )))).andReturn();
        Integer ofertaId = mapper.readTree(resOf.getResponse().getContentAsString()).get("id").asInt();

        // Cliente acepta oferta
        mvc.perform(put("/api/ofertas/" + ofertaId + "/aceptar")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Oferta aceptada"));

        // Solicitud debe estar "En proceso"
        mvc.perform(get("/api/solicitudes/" + solicitudId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("En proceso"));
    }

    @Test
    void clienteRechazaOferta() throws Exception {
        MvcResult resOf = mvc.perform(post("/api/ofertas/solicitud/" + solicitudId)
                .header("Authorization", tokenTecnico)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "precio", 2000, "modalidad", "Presencial", "tiempoEstimado", "3 días"
                )))).andReturn();
        Integer ofertaId = mapper.readTree(resOf.getResponse().getContentAsString()).get("id").asInt();

        mvc.perform(put("/api/ofertas/" + ofertaId + "/rechazar")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Oferta rechazada"));

        // Solicitud debe seguir Pendiente
        mvc.perform(get("/api/solicitudes/" + solicitudId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Pendiente"));
    }

    @Test
    void flujoCompletoHastaFinalizacion() throws Exception {
        // Oferta
        MvcResult resOf = mvc.perform(post("/api/ofertas/solicitud/" + solicitudId)
                .header("Authorization", tokenTecnico)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "precio", 4000, "modalidad", "Presencial", "tiempoEstimado", "1 día"
                )))).andReturn();
        Integer ofertaId = mapper.readTree(resOf.getResponse().getContentAsString()).get("id").asInt();

        // Aceptar
        mvc.perform(put("/api/ofertas/" + ofertaId + "/aceptar")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk());

        // Técnico finaliza → PendienteConfirmacion
        mvc.perform(put("/api/solicitudes/" + solicitudId + "/tecnico-finalizo")
                .header("Authorization", tokenTecnico))
                .andExpect(status().isOk());

        mvc.perform(get("/api/solicitudes/" + solicitudId))
                .andExpect(jsonPath("$.estado").value("PendienteConfirmacion"));

        // Cliente confirma → Finalizada
        mvc.perform(put("/api/solicitudes/" + solicitudId + "/finalizar")
                .header("Authorization", tokenCliente))
                .andExpect(status().isOk());

        mvc.perform(get("/api/solicitudes/" + solicitudId))
                .andExpect(jsonPath("$.estado").value("Finalizada"));
    }
}
