from pathlib import Path

from generate_reference_course_set import layout, render


# One coherent 18-hole course. The routing vocabulary is blended from the five
# mapped Massachusetts sources: Mount Hood's compact wooded bends, Agawam's
# traditional corridors, Maplegate's strategic water/bunkers, Acushnet's varied
# landing areas, and The Meadow at Peabody's broad modern shapes.
COURSE = "Commonwealth_Five_Golf_Club"
HOLES = [
    (COURSE,4,382,[(360,930),(330,760),(300,570),(320,390),(410,205)],"left",3,24),
    (COURSE,5,518,[(350,930),(425,785),(465,620),(430,470),(350,330),(370,205)],"right",4,18),
    (COURSE,3,172,[(350,900),(380,680),(405,455),(370,225)],"none",5,20),
    (COURSE,4,404,[(360,930),(300,780),(285,610),(345,455),(420,205)],"both",3,30),
    (COURSE,4,367,[(350,930),(410,800),(445,640),(400,485),(325,340),(350,205)],"right",4,22),
    (COURSE,5,536,[(355,935),(305,815),(320,680),(395,555),(455,420),(410,300),(345,205)],"left",5,16),
    (COURSE,3,186,[(355,910),(315,690),(340,470),(400,220)],"right",4,26),
    (COURSE,4,396,[(350,930),(400,790),(380,640),(315,505),(300,350),(365,205)],"none",5,32),
    (COURSE,5,548,[(360,935),(425,815),(450,665),(405,530),(330,410),(300,290),(370,205)],"both",4,18),
    (COURSE,4,354,[(355,930),(305,785),(320,625),(390,475),(430,330),(385,205)],"left",3,28),
    (COURSE,3,164,[(350,905),(400,685),(385,465),(335,220)],"both",6,14),
    (COURSE,4,418,[(360,935),(420,790),(425,625),(360,480),(300,330),(340,205)],"right",4,34),
    (COURSE,4,376,[(350,930),(310,785),(345,625),(420,485),(440,335),(380,205)],"none",4,22),
    (COURSE,5,561,[(355,935),(300,815),(285,665),(350,535),(435,410),(420,285),(350,205)],"left",5,20),
    (COURSE,3,193,[(350,910),(405,700),(390,485),(345,220)],"right",5,16),
    (COURSE,4,408,[(355,935),(425,800),(450,650),(400,515),(325,385),(305,205)],"both",4,30),
    (COURSE,4,389,[(360,930),(315,790),(300,635),(355,490),(425,350),(390,205)],"left",3,36),
    (COURSE,5,542,[(355,935),(420,815),(438,675),(385,550),(310,435),(300,305),(370,205)],"right",6,26),
]


def main():
    import generate_reference_course_set as studio
    studio.OUT = Path(__file__).resolve().parents[1] / "output" / "commonwealth_five_golf_club"
    for number, config in enumerate(HOLES, 1):
        design = layout(number + 40, config)
        # Preserve the actual playing-order number while retaining deterministic
        # feature variation from the blended source family.
        for style in ("Classic", "Modern", "Sketch"):
            render(design, number, style)
    print(f"Created {len(HOLES) * 3} JPG files in {studio.OUT}")


if __name__ == "__main__":
    main()
