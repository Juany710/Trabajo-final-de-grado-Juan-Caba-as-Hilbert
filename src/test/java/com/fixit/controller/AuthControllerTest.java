package com.fixit.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test
    void registroYLoginCliente() throws Exception {
        // Registro
        Map<String, Object> reg = Map.of(
            "nombre", "Ana", "apellido", "García", "dni", 11111111,
            "email", "ana.test@fixit.com", "password", "123456", "tipo", "cliente"
        );
        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(reg)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tipo").value("cliente"))
                .andReturn();

        // Login con credenciales correctas
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "ana.test@fixit.com", "password", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.nombre").value("Ana"));

        // Login con contraseña incorrecta
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "email", "ana.test@fixit.com", "password", "wrongpass"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registroYLoginTecnico() throws Exception {
        Map<String, Object> reg = Map.of(
            "nombre", "Pedro", "apellido", "López", "dni", 22222222,
            "email", "pedro.test@fixit.com", "password", "123456",
            "tipo", "tecnico", "especialidades", "Electrónica"
        );
        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(reg)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("tecnico"));
    }

    @Test
    void emailDuplicadoFalla() throws Exception {
        Map<String, Object> reg = Map.of(
            "nombre", "X", "apellido", "Y", "dni", 33333333,
            "email", "dup.test@fixit.com", "password", "123456", "tipo", "cliente"
        );
        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(reg)))
                .andExpect(status().isOk());

        // Segundo registro con mismo email
        Map<String, Object> reg2 = Map.of(
            "nombre", "X2", "apellido", "Y2", "dni", 44444444,
            "email", "dup.test@fixit.com", "password", "123456", "tipo", "cliente"
        );
        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(reg2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El email ya está registrado"));
    }

    @Test
    void checkTokenValido() throws Exception {
        // Registrar y obtener token
        Map<String, Object> reg = Map.of(
            "nombre", "Check", "apellido", "User", "dni", 55555555,
            "email", "check.test@fixit.com", "password", "123456", "tipo", "cliente"
        );
        MvcResult res = mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(reg)))
                .andReturn();

        String token = mapper.readTree(res.getResponse().getContentAsString()).get("token").asText();

        // Verificar token válido
        mvc.perform(get("/api/auth/check").header("Authorization", token))
                .andExpect(status().isOk());

        // Token inválido
        mvc.perform(get("/api/auth/check").header("Authorization", "token-invalido"))
                .andExpect(status().isUnauthorized());
    }
}
