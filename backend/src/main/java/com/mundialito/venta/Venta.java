package com.mundialito.venta;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "ventas")
public class Venta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private OffsetDateTime fecha;

    @Column(nullable = false, length = 120)
    private String cajero;

    @Column(nullable = false, length = 80)
    private String terminal;

    @Column(name = "medio_pago", nullable = false, length = 30)
    private String medioPago;

    @Column(nullable = false, length = 20)
    private String estado;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleVenta> items = new ArrayList<>();

    protected Venta() {
    }

    public Venta(OffsetDateTime fecha, String cajero, String terminal,
            String medioPago, String estado, BigDecimal total) {
        this.fecha = fecha;
        this.cajero = cajero;
        this.terminal = terminal;
        this.medioPago = medioPago;
        this.estado = estado;
        this.total = total;
    }

    public void agregarItem(DetalleVenta item) {
        items.add(item);
        item.setVenta(this);
    }

    public Integer getId() {
        return id;
    }

    public OffsetDateTime getFecha() {
        return fecha;
    }

    public String getCajero() {
        return cajero;
    }

    public String getTerminal() {
        return terminal;
    }

    public String getMedioPago() {
        return medioPago;
    }

    public String getEstado() {
        return estado;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public List<DetalleVenta> getItems() {
        return List.copyOf(items);
    }
}
