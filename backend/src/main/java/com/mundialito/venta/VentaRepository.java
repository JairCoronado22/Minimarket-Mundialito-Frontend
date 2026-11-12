package com.mundialito.venta;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VentaRepository extends JpaRepository<Venta, Integer> {
    @Override
    @EntityGraph(attributePaths = "items")
    java.util.List<Venta> findAll();
}
