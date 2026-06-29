package com.fixit.controller;

import com.fixit.model.Categoria;
import com.fixit.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaRepository categoriaRepo;

    @GetMapping
    public List<Categoria> listar() {
        return categoriaRepo.findAll();
    }

    @GetMapping("/tipo/{tipo}")
    public List<Categoria> porTipo(@PathVariable String tipo) {
        return categoriaRepo.findByTipo(tipo);
    }
}
