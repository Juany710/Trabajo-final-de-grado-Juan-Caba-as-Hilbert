package com.fixit.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AppController {

    @GetMapping({"/tecnico", "/tecnico/"})
    public String tecnicoApp() {
        return "forward:/tecnico/index.html";
    }
}
