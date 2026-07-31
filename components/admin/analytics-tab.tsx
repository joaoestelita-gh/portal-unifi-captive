'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts'
import { Activity, Wifi, Users, Clock, Router, TrendingUp, RefreshCw, Loader2, Filter } from 'lucide-react'
import {
  getAnalyticsSummary,
  getConnectionsByAP,
  getConnectionsBySSID,
  getConnectionsByHour,
  getConnectionsByDay,
  getRecentConnections,
  getUniqueAPs,
  getUniqueSSIDs,
  type AnalyticsFilters,
  type AnalyticsSummary,
  type ConnectionsByAP,
  type ConnectionsBySSID,
  type ConnectionsByHour,
  type ConnectionsByDay,
  type RecentConnection,
} from '@/app/actions/analytics'

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [byAP, setByAP] = useState<ConnectionsByAP[]>([])
  const [bySSID, setBySSID] = useState<ConnectionsBySSID[]>([])
  const [byHour, setByHour] = useState<ConnectionsByHour[]>([])
  const [byDay, setByDay] = useState<ConnectionsByDay[]>([])
  const [recent, setRecent] = useState<RecentConnection[]>([])
  const [uniqueAPs, setUniqueAPs] = useState<string[]>([])
  const [uniqueSSIDs, setUniqueSSIDs] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, apData, ssidData, hourData, dayData, recentData, aps, ssids] = await Promise.all([
        getAnalyticsSummary(filters),
        getConnectionsByAP(filters),
        getConnectionsBySSID(filters),
        getConnectionsByHour(filters),
        getConnectionsByDay(filters),
        getRecentConnections(20, filters),
        getUniqueAPs(),
        getUniqueSSIDs(),
      ])
      setSummary(summaryData)
      setByAP(apData)
      setBySSID(ssidData)
      setByHour(hourData)
      setByDay(dayData)
      setRecent(recentData)
      setUniqueAPs(aps)
      setUniqueSSIDs(ssids)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const peakHour = byHour.reduce((max, h) => h.connections > max.connections ? h : max, { hour: 0, connections: 0 })

  // Visão do gráfico de conexões: por hora do dia ou por dia
  const [connectionsView, setConnectionsView] = useState<'hour' | 'day'>('hour')

  const hourChartData = byHour.map(h => ({
    label: `${String(h.hour).padStart(2, '0')}h`,
    hour: h.hour,
    connections: h.connections,
    isPeak: h.hour === peakHour.hour && h.connections > 0,
  }))

  const dayChartData = byDay.map(d => {
    const [, m, day] = d.date.split('-')
    return {
      label: `${day}/${m}`,
      date: d.date,
      connections: d.connections,
    }
  })

  const totalHourConnections = byHour.reduce((sum, h) => sum + h.connections, 0)
  const totalDayConnections = byDay.reduce((sum, d) => sum + d.connections, 0)
  const busiestDay = byDay.reduce(
    (max, d) => (d.connections > max.connections ? d : max),
    { date: '', connections: 0 },
  )

  const connectionsChartConfig = {
    connections: {
      label: 'Conexões',
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig

  const hasHourData = !byHour.every(h => h.connections === 0)
  const hasDayData = byDay.length > 0

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Analytics de Conexões
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-secondary/30 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined }))}
                  className="h-8 bg-secondary/50 border-border/50 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined }))}
                  className="h-8 bg-secondary/50 border-border/50 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">AP</Label>
                <select
                  value={filters.apName || ''}
                  onChange={(e) => setFilters(f => ({ ...f, apName: e.target.value || undefined }))}
                  className="w-full h-8 rounded-md border border-border/50 bg-secondary/50 px-2 text-sm text-foreground"
                >
                  <option value="">Todos</option>
                  {uniqueAPs.map(ap => (
                    <option key={ap} value={ap}>{ap}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">SSID</Label>
                <select
                  value={filters.ssid || ''}
                  onChange={(e) => setFilters(f => ({ ...f, ssid: e.target.value || undefined }))}
                  className="w-full h-8 rounded-md border border-border/50 bg-secondary/50 px-2 text-sm text-foreground"
                >
                  <option value="">Todos</option>
                  {uniqueSSIDs.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards de resumo */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{summary.totalConnections}</p>
              <p className="text-xs text-muted-foreground">Conexões</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{summary.uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <Wifi className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{summary.uniqueDevices}</p>
              <p className="text-xs text-muted-foreground">Dispositivos</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <Router className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{summary.uniqueAPs}</p>
              <p className="text-xs text-muted-foreground">APs</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{summary.avgSessionMinutes}m</p>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{peakHour.hour}h</p>
              <p className="text-xs text-muted-foreground">Horário Pico</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conexões por AP */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Router className="w-4 h-4 text-green-400" />
              Conexões por AP
            </CardTitle>
            <CardDescription>Ranking de Access Points por tráfego</CardDescription>
          </CardHeader>
          <CardContent>
            {byAP.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma conexão com AP registrado ainda.
                <br />
                <span className="text-xs">Os dados aparecem quando o AP redireciona com parâmetros.</span>
              </p>
            ) : (
              <div className="space-y-2">
                {byAP.map((ap, i) => {
                  const maxConnections = byAP[0]?.totalConnections || 1
                  const percentage = Math.round((ap.totalConnections / maxConnections) * 100)
                  return (
                    <div key={ap.apName} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                          <span className="text-foreground font-medium">{ap.apName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{ap.uniqueUsers} usr</Badge>
                          <span className="text-foreground font-bold">{ap.totalConnections}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden ml-7">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conexões por SSID */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="w-4 h-4 text-cyan-400" />
              Conexões por Rede (SSID)
            </CardTitle>
            <CardDescription>Distribuição por rede WiFi</CardDescription>
          </CardHeader>
          <CardContent>
            {bySSID.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma conexão com SSID registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {bySSID.map(s => {
                  const maxConn = bySSID[0]?.totalConnections || 1
                  const pct = Math.round((s.totalConnections / maxConn) * 100)
                  return (
                    <div key={s.ssid} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{s.ssid}</span>
                        <span className="text-foreground font-bold">{s.totalConnections}</span>
                      </div>
                      <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conexões por Hora / Dia */}
        <Card className="bg-card/50 border-border/50 lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {connectionsView === 'hour' ? 'Conexões por Hora do Dia' : 'Conexões por Dia'}
                </CardTitle>
                <CardDescription>
                  {connectionsView === 'hour'
                    ? 'Distribuição ao longo das 24 horas (período filtrado)'
                    : 'Evolução diária de conexões (últimos 30 dias)'}
                </CardDescription>
              </div>
              <div className="inline-flex shrink-0 rounded-lg border border-border/50 bg-secondary/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setConnectionsView('hour')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    connectionsView === 'hour'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Por Hora
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionsView('day')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    connectionsView === 'day'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Por Dia
                </button>
              </div>
            </div>

            {/* Mini-estatísticas do período */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {connectionsView === 'hour' ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-foreground">{totalHourConnections}</span>
                    <span className="text-xs text-muted-foreground">conexões</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-amber-400">{peakHour.hour}h</span>
                    <span className="text-xs text-muted-foreground">horário de pico ({peakHour.connections})</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-foreground">{totalDayConnections}</span>
                    <span className="text-xs text-muted-foreground">conexões no período</span>
                  </div>
                  {busiestDay.connections > 0 && (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-amber-400">
                        {busiestDay.date.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                      <span className="text-xs text-muted-foreground">dia mais movimentado ({busiestDay.connections})</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {connectionsView === 'hour' ? (
              hasHourData ? (
                <ChartContainer config={connectionsChartConfig} className="h-[260px] w-full">
                  <BarChart data={hourChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={1}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                      content={<ChartTooltipContent labelKey="label" />}
                    />
                    <Bar dataKey="connections" radius={[4, 4, 0, 0]}>
                      {hourChartData.map((entry) => (
                        <Cell
                          key={entry.hour}
                          fill={entry.isPeak ? 'var(--chart-4)' : 'var(--chart-1)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Nenhuma conexão registrada ainda.
                </p>
              )
            ) : hasDayData ? (
              <ChartContainer config={connectionsChartConfig} className="h-[260px] w-full">
                <AreaChart data={dayChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillConnections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: 'var(--border)' }}
                    content={<ChartTooltipContent labelKey="label" />}
                  />
                  <Area
                    dataKey="connections"
                    type="monotone"
                    fill="url(#fillConnections)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">
                Nenhuma conexão registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas conexões */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
            Últimas Conexões
          </CardTitle>
          <CardDescription>Histórico recente de conexões ao portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-hidden max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                  <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
                  <TableHead className="text-muted-foreground font-medium">MAC</TableHead>
                  <TableHead className="text-muted-foreground font-medium">AP</TableHead>
                  <TableHead className="text-muted-foreground font-medium">SSID</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Horário</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma conexão registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map(conn => (
                    <TableRow key={conn.id} className="border-border/30 hover:bg-secondary/20">
                      <TableCell className="text-foreground text-sm">
                        {conn.userName || 'Voucher'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {conn.macAddress || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conn.apName || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conn.ssid || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(conn.startTime).toLocaleString('pt-BR', { 
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          conn.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : conn.status === 'expired'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-secondary text-muted-foreground'
                        }>
                          {conn.status === 'active' ? 'Ativa' : conn.status === 'expired' ? 'Expirada' : 'Encerrada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
