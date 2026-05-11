package com.dynamicform.controller;

import com.dynamicform.entity.FormTemplate;
import com.dynamicform.repository.FormTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/form-templates")
@CrossOrigin(origins = "*")
public class FormTemplateController {

    @Autowired
    private FormTemplateRepository formTemplateRepository;

    @GetMapping
    public ResponseEntity<List<FormTemplate>> getAllTemplates() {
        List<FormTemplate> templates = formTemplateRepository.findAll();
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getTemplateById(@PathVariable Long id) {
        Optional<FormTemplate> templateOpt = formTemplateRepository.findById(id);
        if (!templateOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        FormTemplate template = templateOpt.get();
        Map<String, Object> result = new HashMap<>();
        result.put("id", template.getId());
        result.put("templateName", template.getTemplateName());
        result.put("templateSchema", template.getTemplateSchema());
        result.put("createdAt", template.getCreatedAt());
        result.put("updatedAt", template.getUpdatedAt());

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<FormTemplate> createTemplate(@RequestBody Map<String, Object> payload) {
        FormTemplate template = new FormTemplate();
        template.setTemplateName((String) payload.get("templateName"));
        template.setTemplateSchema((String) payload.get("templateSchema"));

        FormTemplate saved = formTemplateRepository.save(template);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FormTemplate> updateTemplate(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Optional<FormTemplate> templateOpt = formTemplateRepository.findById(id);
        if (!templateOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        FormTemplate template = templateOpt.get();
        if (payload.containsKey("templateName")) {
            template.setTemplateName((String) payload.get("templateName"));
        }
        if (payload.containsKey("templateSchema")) {
            template.setTemplateSchema((String) payload.get("templateSchema"));
        }

        FormTemplate saved = formTemplateRepository.save(template);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        if (!formTemplateRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        formTemplateRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
